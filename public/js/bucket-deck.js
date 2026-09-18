const BucketDeck = (() => {
  function shuffle(cards, random = Math.random) {
    const ids=cards.map(c=>c.id);
    for(let i=ids.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]];}
    return ids;
  }
  function fill(data, turn, catalog, order) {
    const used=data.turnActions?.[turn]||{};
    if(used.fill||used.done||used.discard)return null;
    const hand=[...(data.hand||[])];
    const seen=new Set(data.drawnBucketIds||[]);
    const titles=new Set([...hand,...(data.achieved||[])].map(c=>c[0]));
    const byId=new Map(catalog.map(c=>[c.id,c]));
    const deck=data.bucketDeckOrder||order;
    for(const id of deck){
      if(hand.length>=5)break;
      const c=byId.get(id);if(!c||seen.has(id)||titles.has(c.title))continue;
      hand.push([c.title,c.cash,c.time,c.score,turn,id]);seen.add(id);titles.add(c.title);
    }
    return {...data,hand,bucketDeckOrder:deck,drawnBucketIds:[...seen]};
  }
  return {shuffle,fill};
})();
